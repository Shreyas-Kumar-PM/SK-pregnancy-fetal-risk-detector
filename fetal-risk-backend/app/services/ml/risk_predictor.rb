# app/services/ml/risk_predictor.rb
require "open3"
require "json"

module Ml
  class RiskPredictor
    # Path to your predict.py script (from backend folder)
    PREDICT_SCRIPT = File.expand_path("../../../../ml/predict.py", __dir__)

    class PredictionError < StandardError; end

    # vitals_hash is a Ruby hash, e.g.:
    # {
    #   maternal_hr: 90,
    #   systolic_bp: 130,
    #   diastolic_bp: 85,
    #   fetal_hr: 145,
    #   fetal_movement_count: 8,
    #   spo2: 96,
    #   temperature: 37.0,
    #   age: 25,
    #   bs: 90
    # }
    def self.call(vitals_hash)
      raise PredictionError, "predict.py not found" unless File.exist?(PREDICT_SCRIPT)

      json_input = vitals_hash.to_json

      # Run: python ml/predict.py '<json>'
      cmd = ["python", PREDICT_SCRIPT, json_input]
      stdout, stderr, status = Open3.capture3(*cmd)

      unless status.success?
        raise PredictionError, "predict.py failed: #{stderr.presence || 'unknown error'}"
      end

      begin
        result = JSON.parse(stdout)
      rescue JSON::ParserError => e
        raise PredictionError, "Invalid JSON from predict.py: #{e.message}"
      end

      result
    end
  end
end
