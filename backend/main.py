import os
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect, Depends, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from backend.database import engine, Base, get_db
from backend.models import ScanHistory, ConsentLog
from backend.schemas import DetectionResponse, ChunkResult, ErrorResponse, LiveChunkResponse
from backend.model_service import process_audio_file, process_audio_chunk, get_verdict, CHUNK_LENGTH_SEC

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Voice Clone Scam Shield API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/detect", response_model=DetectionResponse, responses={400: {"model": ErrorResponse}})
async def detect_file(
    file: UploadFile = File(...), 
    threshold: float = Form(0.2),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(('.wav', '.flac', '.mp3', '.m4a')):
        raise HTTPException(status_code=400, detail="Unsupported file format.")
    
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file.")
        
    try:
        scores = process_audio_file(file_bytes, threshold=threshold)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not scores:
        raise HTTPException(status_code=400, detail="Audio file too short to process.")
        
    overall_score = sum(scores) / len(scores)
    # Use the adaptive get_verdict logic that handles OOD inversion
    verdict = get_verdict(overall_score, threshold)
    
    chunks = []
    for i, score in enumerate(scores):
        chunks.append(ChunkResult(
            chunk_index=i,
            score=score,
            verdict=get_verdict(score, threshold),
            start_time=i * CHUNK_LENGTH_SEC,
            end_time=(i + 1) * CHUNK_LENGTH_SEC
        ))
        
    # Log to history
    history_entry = ScanHistory(
        filename=file.filename,
        scan_type="file",
        verdict=verdict,
        confidence=overall_score
    )
    db.add(history_entry)
    db.commit()
    
    return DetectionResponse(
        verdict=verdict,
        overall_confidence=overall_score,
        chunks=chunks
    )

@app.websocket("/api/live")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    # Expect first message to be consent
    try:
        initial_msg = await websocket.receive_json()
        if not initial_msg.get("consent"):
            await websocket.close(code=1008) # Policy violation
            return
            
        session_id = initial_msg.get("session_id", "anonymous")
        consent_log = ConsentLog(session_id=session_id, consent_given=1)
        db.add(consent_log)
        db.commit()
        
        # Log live scan start
        history_entry = ScanHistory(
            filename=f"live_{session_id}",
            scan_type="live",
            verdict="Processing",
            confidence=0.0
        )
        db.add(history_entry)
        db.commit()
        history_id = history_entry.id
        
        chunk_scores = []
        
        while True:
            data = await websocket.receive_bytes()
            if not data:
                continue
                
            try:
                # We expect the frontend to send valid WAV chunks or raw PCM.
                # If they send WebM audio from MediaRecorder, we'd need to convert it first.
                # For simplicity here, assuming process_audio_chunk can handle it.
                score = process_audio_chunk(data, sample_rate=16000)
                
                chunk_scores.append(score)
                rolling_avg = sum(chunk_scores[-5:]) / len(chunk_scores[-5:])
                verdict = get_verdict(rolling_avg)
                
                await websocket.send_json(LiveChunkResponse(
                    verdict=verdict,
                    score=score
                ).dict())
                
            except Exception as e:
                await websocket.send_json({"error": str(e)})
                
    except WebSocketDisconnect:
        # Client disconnected
        pass
        
    if 'chunk_scores' in locals() and chunk_scores and history_entry:
        overall_avg = sum(chunk_scores) / len(chunk_scores)
        history_entry.confidence = overall_avg
        history_entry.verdict = get_verdict(overall_avg)
        db.commit()

@app.get("/api/history")
async def get_history(db: Session = Depends(get_db)):
    return db.query(ScanHistory).order_by(ScanHistory.timestamp.desc()).limit(50).all()

@app.get("/")
def read_root():
    return {"status": "ok"}
