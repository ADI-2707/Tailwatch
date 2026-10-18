from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class LogEvent(BaseModel):
    ts: datetime
    level: str = "info"
    service: str
    host: Optional[str] = None
    source: Optional[str] = ""
    message: str
    fields: Dict[str, Any] = Field(default_factory=dict)
    trace_id: Optional[str] = None
    seq: Optional[int] = None

class AgentMetadata(BaseModel):
    host: str
    version: str

class IngestBatchRequest(BaseModel):
    batch_id: str
    agent: Optional[AgentMetadata] = None
    events: List[LogEvent]
