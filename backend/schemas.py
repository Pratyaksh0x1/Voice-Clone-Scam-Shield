from pydantic import BaseModel
from typing import List, Optional

class ChunkResult(BaseModel):
    chunk_index: int
    score: float
    verdict: str
    start_time: float
    end_time: float

class DetectionResponse(BaseModel):
    verdict: str  # "Real" or "Fake"
    overall_confidence: float
    chunks: List[ChunkResult]

class ErrorResponse(BaseModel):
    detail: str

class LiveChunkResponse(BaseModel):
    verdict: str
    score: float
