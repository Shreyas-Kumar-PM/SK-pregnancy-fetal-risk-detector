# app/controllers/api/v1/explain_controller.rb
class Api::V1::ExplainController < ApplicationController
  before_action :authorize_request

  def create
    risk_params = params.require(:risk).permit(
      :risk_level,
      :risk_score,
      :reason,
      :model_version,
      :ml_risk_level,
      :ml_logreg_risk_level,
      ml_class_probabilities: {},
      ml_logreg_class_probabilities: {}
    )

    result = AiExplanationService.call(risk_params.to_h)

    render json: {
      explanation: result["explanation"],
      ai_enabled:  result["ai_enabled"]
    }, status: :ok
  end
end
