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
      uri = URI.parse(ML_URL)

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"

      # ⏱ Prevent UI freezes / hanging requests
      http.open_timeout = 3
      http.read_timeout = 6

      request = Net::HTTP::Post.new(
        uri.request_uri,
        {
          "Content-Type" => "application/json",
          "Accept" => "application/json"
        }
      )

      request.body = vitals_hash.to_json

      response = http.request(request)

      unless response.code.to_i == 200
        Rails.logger.error(
          "[ML] Non-200 response (#{response.code}) → #{response.body}"
        )
        raise PredictionError, "ML HTTP #{response.code}"
      end

      JSON.parse(response.body)
    rescue => e
      Rails.logger.error("[ML] HTTP FAILED → #{e.class}: #{e.message}")
      fallback
    end

    def self.fallback
      {
        "risk_level" => "normal",
        "risk_score" => 0.10,
        "reason" => "ML service unavailable – fallback used",
        "model_version" => "fallback",
        "ml_risk_level" => nil,
        "ml_class_probabilities" => nil,
        "ml_logreg_risk_level" => nil,
        "ml_logreg_class_probabilities" => nil
      }
    end
  end
end
