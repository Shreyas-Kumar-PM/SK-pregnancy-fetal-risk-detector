# app/services/ml/risk_predictor.rb
require "net/http"
require "json"
require "uri"

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
      http.use_ssl = (uri.scheme == "https")

      # ⏱️ Important: prevent hanging requests
      http.open_timeout = 5
      http.read_timeout = 8

      request = Net::HTTP::Post.new(uri.request_uri)
      request["Content-Type"] = "application/json"
      request["Accept"] = "application/json"
      request.body = vitals_hash.to_json

      response = http.request(request)

      unless response.is_a?(Net::HTTPSuccess)
        raise PredictionError,
              "ML HTTP #{response.code}: #{response.body}"
      end

      JSON.parse(response.body)
    rescue => e
      Rails.logger.error("[ML] HTTP FAILED → #{e.class}: #{e.message}")
      fallback(e.message)
    end

    def self.fallback(error_message = nil)
      {
        "risk_level"     => "normal",
        "risk_score"     => 0.10,
        "reason"         => error_message ?
                              "ML service error (fallback): #{error_message}" :
                              "ML service unavailable (fallback)",
        "model_version" => "fallback",
        "ml_risk_level" => nil,
        "ml_class_probabilities" => nil,
        "ml_logreg_risk_level" => nil,
        "ml_logreg_class_probabilities" => nil
      }
    end
  end
end
