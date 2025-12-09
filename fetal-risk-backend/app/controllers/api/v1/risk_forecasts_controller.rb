# app/controllers/api/v1/risk_forecasts_controller.rb
module Api
  module V1
    class RiskForecastsController < ApplicationController
      before_action :authorize_request
      before_action :set_patient

      # GET /api/v1/patients/:patient_id/risk_forecast
      def show
        evaluations = @patient.risk_evaluations.order(created_at: :asc).last(12)

        if evaluations.empty?
          render json: {
            patient_id: @patient.id,
            base_time: nil,
            method: "trend_extrapolation_v1",
            points: []
          }, status: :ok
          return
        end

        base_time = evaluations.last.created_at

        # Use stored risk_score; fallback to 0.1
        scores = evaluations.map { |e| (e.risk_score || 0.1).to_f }

        # Simple trend: slope across last N points
        slope =
          if scores.size >= 2
            (scores.last - scores.first) / (scores.size - 1).to_f
          else
            0.0
          end

        horizons = [1, 3, 6, 12] # hours into the future

        points = horizons.each_with_index.map do |hours, idx|
          # Slightly amplify slope with index so curve is visible but not crazy
          factor = 1.0 + idx * 0.3
          raw_score = scores.last + slope * factor

          risk_score = [[raw_score, 0.0].max, 1.0].min.round(3)

          risk_level =
            if risk_score < 0.35
              "normal"
            elsif risk_score < 0.7
              "warning"
            else
              "critical"
            end

          {
            horizon_hours: hours,
            at: (base_time + hours.hours).iso8601,
            risk_score: risk_score,
            risk_level: risk_level
          }
        end

        render json: {
          patient_id: @patient.id,
          base_time: base_time.iso8601,
          method: "trend_extrapolation_v1",
          points: points
        }, status: :ok
      rescue => e
        Rails.logger.error("[RiskForecastsController] Forecast failed: #{e.class} - #{e.message}")
        render json: { error: "Failed to compute forecast." }, status: :internal_server_error
      end

      private

      def set_patient
        @patient = Patient.find_by(id: params[:patient_id])

        unless @patient
          render json: { error: "Patient not found" }, status: :not_found
          return
        end

        # Same ownership check pattern as other controllers
        if @patient.user_id != current_user.id
          render json: { error: "Not authorized for this patient" }, status: :forbidden
        end
      end
    end
  end
end
