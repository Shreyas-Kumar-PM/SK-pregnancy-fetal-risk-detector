# app/services/ai_explanation_service.rb
require "openai"

class AiExplanationService
  # A small, cheap model name that works with ruby-openai
  MODEL_NAME = "gpt-4o-mini".freeze

  class << self
    def call(risk_hash)
      api_key = ENV["OPENAI_API_KEY"]

      unless api_key.present?
        Rails.logger.warn("[AI Explain] No OPENAI_API_KEY set, using fallback.")
        return fallback_response(risk_hash, ai_enabled: false, reason: "no_api_key")
      end

      client = build_client(api_key)
      prompt = build_prompt(risk_hash)

      Rails.logger.info("[AI Explain] Calling OpenAI (ruby-openai) with model=#{MODEL_NAME}")

      response = client.chat(
        parameters: {
          model: MODEL_NAME,
          messages: [
            { role: "system", content: system_prompt },
            { role: "user",   content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 400
        }
      )

      content = dig_content(response)

      if content.blank?
        Rails.logger.warn("[AI Explain] Empty AI content, using fallback.")
        return fallback_response(risk_hash, ai_enabled: false, reason: "empty_ai_content")
      end

      {
        "ai_enabled"  => true,
        "explanation" => content
      }
    rescue => e
      Rails.logger.error("[AI Explain] #{e.class}: #{e.message}")
      fallback_response(risk_hash, ai_enabled: false, reason: "exception: #{e.class}")
    end

    private

    # ruby-openai client with SSL verify disabled only in development
    def build_client(api_key)
      OpenAI::Client.new(access_token: api_key) do |faraday|
        if Rails.env.development?
          faraday.ssl[:verify] = false  # dev-only workaround for SSL issues
        end
      end
    end

    def system_prompt
      <<~SYS
        You are an assistant that explains maternal–fetal risk assessments
        to pregnant patients in clear, calm, non-alarming language.
        You are NOT giving a diagnosis. You only explain what the
        numbers mean and when they should talk to a doctor.
      SYS
    end

    def build_prompt(risk_hash)
      risk_level    = risk_hash["risk_level"]
      risk_score    = risk_hash["risk_score"]
      reason        = risk_hash["reason"]
      model_ver     = risk_hash["model_version"]
      rf_level      = risk_hash["ml_risk_level"]
      logreg_level  = risk_hash["ml_logreg_risk_level"]

      <<~PROMPT
        You are helping explain a maternal–fetal risk screen result.

        Current risk level (heuristic): #{risk_level.inspect}
        Risk score (0–1): #{risk_score.inspect}
        Heuristic reason text: #{reason.inspect}

        RF (PSO) model risk level: #{rf_level.inspect}
        Logistic Regression model risk level: #{logreg_level.inspect}
        Model version used: #{model_ver.inspect}

        Please explain this result to a pregnant patient in:
        - short, friendly paragraphs (3–6 sentences total)
        - calm and non-alarming language
        - clearly stating that this is only a screening tool, not a diagnosis
        - include simple guidance on when to contact their doctor
        - avoid medical jargon where possible
      PROMPT
    end

    def dig_content(response)
      choice = response.dig("choices", 0)
      return nil unless choice

      message = choice["message"] || {}
      message["content"]
    end

    def fallback_response(risk_hash, ai_enabled:, reason:)
      score        = risk_hash["risk_score"]
      score_str    = score.is_a?(Numeric) ? score.round(2) : "N/A"

      main_reason  = risk_hash["reason"] || "based on the current vital signs."
      model_version = risk_hash["model_version"] || "heuristic_only"
      rf_level      = risk_hash["ml_risk_level"]
      logreg_level  = risk_hash["ml_logreg_risk_level"]

      model_text = +"The system used the **#{model_version}** model, which combines a rule-based clinical heuristic with data-driven machine-learning components."
      model_text << " The Random Forest model (PSO-tuned) classified this case as **#{rf_level}**." if rf_level
      model_text << " The Logistic Regression model classified this case as **#{logreg_level}**." if logreg_level

      explanation = <<~TEXT
        The current evaluation suggests the vital signs are within an acceptable range.

        The calculated risk score is **#{score_str}** on a scale from 0 (lowest) to 1 (highest).

        The main factors contributing to this assessment are: #{main_reason}.

        #{model_text}

        This explanation is intended to support understanding, but it is **not** a diagnosis.
        Any concerning symptoms or persistent abnormalities should be discussed with a qualified
        healthcare professional or obstetrician as soon as possible.
      TEXT

      {
        "ai_enabled"  => ai_enabled,
        "explanation" => explanation
      }
    end
  end
end
