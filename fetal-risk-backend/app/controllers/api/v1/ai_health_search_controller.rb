# app/controllers/api/v1/ai_health_search_controller.rb
class Api::V1::AiHealthSearchController < ApplicationController
  before_action :authorize_request

  # POST /api/v1/ai_health_search
  def create
    question = params[:question].to_s.strip

    if question.blank?
      render json: { error: "question is required" }, status: :unprocessable_entity
      return
    end

    result = AiHealthSearchService.call(question)
    render json: result, status: :ok
  end
end
