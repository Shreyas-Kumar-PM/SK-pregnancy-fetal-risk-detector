# app/controllers/api/v1/ai_patterns_controller.rb
module Api
  module V1
    class AiPatternsController < ApplicationController
      before_action :authorize_request
      before_action :set_patient

      # POST /api/v1/patients/:patient_id/ai_patterns
      def create
        readings = @patient.readings.order(recorded_at: :desc)
        risks    = @patient.risk_evaluations.order(created_at: :desc)

        result = AiPatternsService.call(
          patient:  @patient,
          readings: readings,
          risks:    risks
        )

        render json: result, status: :ok
      end

      private

      def set_patient
        @patient = Patient.find_by(id: params[:patient_id])

        unless @patient
          render json: { error: "Patient not found" }, status: :not_found
          return
        end

        # Make sure this patient belongs to the logged-in user
        if @patient.user_id != current_user.id
          render json: { error: "Not authorized for this patient" }, status: :forbidden
        end
      end
    end
  end
end
