class Api::V1::RiskController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  # GET /api/v1/patients/:patient_id/current_risk
  def current
    evaluation = @patient.risk_evaluations
                         .includes(:reading)
                         .order(created_at: :desc)
                         .first

    unless evaluation
      render json: {
        risk_level: "normal",
        risk_score: 0.10,
        reason: "No risk evaluations yet.",
        model_version: "no_data"
      }, status: :ok
      return
    end

    reading = evaluation.reading

    # ✅ SAFE defaults (match ML expectations EXACTLY)
    payload = {
      maternal_hr:          reading.maternal_hr || 90,
      systolic_bp:          reading.systolic_bp || 120,
      diastolic_bp:         reading.diastolic_bp || 80,
      fetal_hr:             reading.fetal_hr || 140,
      fetal_movement_count: reading.fetal_movement_count || 10,
      spo2:                 reading.spo2 || 98,
      temperature:          reading.temperature || 36.8,
      age:                  @patient.age || 30,
      bs:                   reading.respond_to?(:bs) && reading.bs.present? ? reading.bs : 90
    }

    prediction = Ml::RiskPredictor.call(payload)

    render json: {
      id: evaluation.id,
      risk_level: prediction["risk_level"],
      risk_score: prediction["risk_score"],
      reason: prediction["reason"],
      model_version: prediction["model_version"],
      ml_risk_level: prediction["ml_risk_level"],
      ml_class_probabilities: prediction["ml_class_probabilities"],
      ml_logreg_risk_level: prediction["ml_logreg_risk_level"],
      ml_logreg_class_probabilities: prediction["ml_logreg_class_probabilities"],
      created_at: evaluation.created_at,
      updated_at: evaluation.updated_at,
      reading: payload
    }, status: :ok
  end

  # GET /api/v1/patients/:patient_id/risk_history
  def history
    render json: @patient.risk_evaluations
                         .order(created_at: :desc)
                         .limit(200),
           status: :ok
  end

  private

  def set_patient
    @patient = Patient.find_by(id: params[:patient_id])

    unless @patient && @patient.user_id == current_user.id
      render json: { error: "Not authorized" }, status: :forbidden
    end
  end
end
