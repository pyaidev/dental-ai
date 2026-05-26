from pydantic import BaseModel


class AnalysisResult(BaseModel):
    id: int
    patient_fio: str
    card_number: str
    plaque_pct_front: float | None
    plaque_pct_right: float | None
    plaque_pct_left: float | None
    plaque_pct_overall: float | None
    index_fedorov: float | None
    index_api_lange: float | None
    index_ohi_s: float | None
    recommendations: str | None
    pdf_url: str | None

    class Config:
        from_attributes = True


class PatientHistory(BaseModel):
    date: str
    plaque_pct: float
    index_fedorov: float | None
    index_api_lange: float | None
    index_ohi_s: float | None
