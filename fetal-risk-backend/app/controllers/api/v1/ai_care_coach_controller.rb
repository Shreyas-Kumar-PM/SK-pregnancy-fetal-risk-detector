# app/controllers/api/v1/ai_care_coach_controller.rb
class Api::V1::AiCareCoachController < ApplicationController
  before_action :authorize_request

  # POST /api/v1/ai/care_coach
  # Body: { patient_id: 1 }
  def create
    patient_id = params[:patient_id] || params.dig(:care_coach, :patient_id)

    patient =
      if current_user.respond_to?(:patient) && current_user.patient.present?
        current_user.patient
      else
        Patient.find_by(id: patient_id, user_id: current_user.id)
      end

    unless patient
      render json: { error: "Patient not found for this user" }, status: :not_found
      return
    end

    evaluation = patient.risk_evaluations.order(created_at: :desc).first

    unless evaluation
      # No risk yet → generic normal-level tips
      render json: AiCareCoachService.call(
        { "risk_level" => "normal", "risk_score" => 0.1, "reason" => "No risk evaluations yet." }
      ), status: :ok
      return
    end

    risk_hash = {
      "risk_level" => evaluation.risk_level,
      "risk_score" => evaluation.risk_score,
      "reason"     => evaluation.reason
    }

    result = AiCareCoachService.call(risk_hash)
    render json: result, status: :ok
  end
end
