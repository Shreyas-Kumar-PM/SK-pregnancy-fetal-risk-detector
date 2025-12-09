# app/controllers/api/v1/risk_controller.rb
class Api::V1::RiskController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  # GET /api/v1/patients/:patient_id/current_risk
  def current
    return if performed?  # if set_patient already rendered error

    evaluation = @patient.risk_evaluations
                         .includes(:reading)
                         .order(created_at: :desc)
                         .first

    unless evaluation
      render json: {
        risk_level: nil,
        risk_score: nil,
        reason:     "No risk evaluations yet for this patient."
      }, status: :ok
      return
    end

    reading = evaluation.reading

    # --- derive age for ML (use stored age / DOB or fallback) ---
    age =
      age = @patient.age.presence || 25


    # --- derive blood sugar (bs) for ML (use reading value or fallback) ---
    bs =
      if reading.respond_to?(:bs) && reading.bs.present?
        reading.bs
      elsif reading.respond_to?(:blood_sugar) && reading.blood_sugar.present?
        reading.blood_sugar
      else
        90  # fallback default BS (same units as training data)
      end

    # --- fallbacks for other vitals required by ML ---
    maternal_hr  = reading.maternal_hr.presence  || 90
    systolic_bp  = reading.systolic_bp.presence  || 120
    diastolic_bp = reading.diastolic_bp.presence || 80
    temperature  = reading.temperature.presence  || 36.8

    # --- build vitals hash for predict.py (matches keys in predict.py) ---
    vitals = {
      maternal_hr:          maternal_hr,
      systolic_bp:          systolic_bp,
      diastolic_bp:         diastolic_bp,
      fetal_hr:             reading.fetal_hr,
      fetal_movement_count: reading.fetal_movement_count,
      spo2:                 reading.spo2,
      temperature:          temperature,
      age:                  age,
      bs:                   bs
    }

    prediction = Ml::RiskPredictor.call(vitals)

    # Use the new hybrid model's values for API response
    render json: {
      id:                evaluation.id,
      risk_level:        prediction["risk_level"],
      risk_score:        prediction["risk_score"],
      reason:            prediction["reason"],
      created_at:        evaluation.created_at,
      updated_at:        evaluation.updated_at,
      model_version:     prediction["model_version"],
      ml_risk_level:     prediction["ml_risk_level"],
      ml_class_probabilities:      prediction["ml_class_probabilities"],
      # 🔵 NEW: Logistic Regression outputs
      ml_logreg_risk_level:        prediction["ml_logreg_risk_level"],
      ml_logreg_class_probabilities: prediction["ml_logreg_class_probabilities"],
      reading: {
        id:                     reading.id,
        maternal_hr:            reading.maternal_hr,
        systolic_bp:            reading.systolic_bp,
        diastolic_bp:           reading.diastolic_bp,
        fetal_hr:               reading.fetal_hr,
        fetal_movement_count:   reading.fetal_movement_count,
        spo2:                   reading.spo2,
        temperature:            reading.temperature,
        recorded_at:            reading.recorded_at,
        age:                    age,
        bs:                     bs
      }
    }, status: :ok

  rescue Ml::RiskPredictor::PredictionError => e
    Rails.logger.error("Risk prediction failed: #{e.message}")
    # Fall back to the stored evaluation if ML fails
    render json: {
      id:         evaluation&.id,
      risk_level: evaluation&.risk_level,
      risk_score: evaluation&.risk_score,
      reason:     evaluation&.reason || "Risk evaluation available but ML prediction failed.",
      created_at: evaluation&.created_at,
      updated_at: evaluation&.updated_at
    }, status: :ok
  end

  # GET /api/v1/patients/:patient_id/risk_history
  def history
    return if performed?

    evaluations = @patient.risk_evaluations
                          .order(created_at: :desc)
                          .limit(200)

    render json: evaluations.as_json(
      only: %i[id risk_level risk_score reason created_at updated_at reading_id]
    )
  end

  private

  def set_patient
    @patient = Patient.find_by(id: params[:patient_id])

    unless @patient
      render json: { error: "Patient not found" }, status: :not_found
      return
    end

    # Ensure this patient belongs to current_user
    if @patient.user_id != current_user.id
      render json: { error: "Not authorized for this patient" }, status: :forbidden
      return
    end
  end
end
