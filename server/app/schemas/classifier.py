from pydantic import BaseModel, Field


class ClassifierResult(BaseModel):
    predicted_category: str
    predicted_subcategory: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    model_version: str = "xlm-roberta-it-v1.0"
    all_scores: dict[str, float] = Field(default_factory=dict)
