# app/services/ml/risk_predictor.rb
require "net/http"
require "json"

module Ml
  class RiskPredictor
    ML_URL = ENV.fetch(
      "ML_SERVICE_URL",
      "https://skfetal-risk-ml.onrender.com/predict"
    )

    class PredictionError < StandardError; end

    def self.call(vitals_hash)
      uri = URI(ML_URL)

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true

      request = Net::HTTP::Post.new(
        uri.path,
        { "Content-Type" => "application/json" }
      )

      request.body = vitals_hash.to_json
      response = http.request(request)

      unless response.code.to_i == 200
        raise PredictionError, "ML HTTP #{response.code}: #{response.body}"
      end

      JSON.parse(response.body)
    rescue => e
      Rails.logger.error("ML HTTP FAILED: #{e.message}")
      fallback
    end

    def self.fallback
      {
        "risk_level" => "normal",
        "risk_score" => 0.1,
        "reason"     => "ML service unavailable (fallback)",
        "model_version" => "fallback"
      }
    end
  end
end
