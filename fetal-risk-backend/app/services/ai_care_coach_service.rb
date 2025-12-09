# app/services/ai_care_coach_service.rb
require "openai"

class AiCareCoachService
  MODEL_NAME = "gpt-4o-mini".freeze

  class << self
    # risk_hash is expected to look like:
    # {
    #   "risk_level" => "normal|warning|critical",
    #   "risk_score" => Float,
    #   "reason"     => "..."
    # }
    def call(risk_hash)
      api_key = ENV["OPENAI_API_KEY"]

      # If no API key, return a safe generic fallback
      unless api_key.present?
        Rails.logger.warn("[AI Care Coach] No OPENAI_API_KEY set, using fallback tips.")
        return fallback_tips(risk_hash, ai_enabled: false, reason: "no_api_key")
      end

      client = build_client(api_key)
      prompt = build_prompt(risk_hash)

      Rails.logger.info("[AI Care Coach] Calling OpenAI with model=#{MODEL_NAME}")

      response = client.chat(
        parameters: {
          model: MODEL_NAME,
          messages: [
            { role: "system", content: system_prompt },
            { role: "user",   content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 400
        }
      )

      content = dig_content(response)

      if content.blank?
        Rails.logger.warn("[AI Care Coach] Empty AI content, using fallback.")
        return fallback_tips(risk_hash, ai_enabled: false, reason: "empty_ai_content")
      end

      {
        "ai_enabled" => true,
        "tips"       => content
      }
    rescue => e
      Rails.logger.error("[AI Care Coach] #{e.class}: #{e.message}")
      fallback_tips(risk_hash, ai_enabled: false, reason: "exception: #{e.class}")
    end

    private

    def build_client(api_key)
      OpenAI::Client.new(access_token: api_key) do |faraday|
        # same SSL workaround you used for explanation service in development
        if Rails.env.development?
          faraday.ssl[:verify] = false
        end
      end
    end

    def system_prompt
      <<~SYS
        You are a gentle pregnancy care coach.
        You DO NOT diagnose or prescribe medicines.
        You give short, friendly, practical lifestyle and monitoring tips
        based on the current maternal–fetal risk level.

        Rules:
        - 3–6 short bullet points only.
        - Use calm, non-alarming language.
        - Focus on rest, hydration, monitoring symptoms, stress reduction,
          keeping appointments, and when to contact a doctor.
        - Never mention specific medicine names, doses, or treatments.
        - Always remind that this is not a diagnosis and does not replace a doctor.
      SYS
    end

    def build_prompt(risk_hash)
      level  = risk_hash&.fetch("risk_level", nil)
      score  = risk_hash&.fetch("risk_score", nil)
      reason = risk_hash&.fetch("reason", nil)

      <<~PROMPT
        Current screening result:

        - Risk level: #{level.inspect}
        - Risk score (0–1): #{score.inspect}
        - Reason text: #{reason.inspect}

        Based on this, give lifestyle / self-care tips for the pregnant person.
      PROMPT
    end

    def dig_content(response)
      choice = response.dig("choices", 0)
      return nil unless choice

      message = choice["message"] || {}
      message["content"]
    end

    def fallback_tips(risk_hash, ai_enabled:, reason:)
      level = risk_hash&.fetch("risk_level", "unknown")

      base = case level
             when "critical"
               [
                 "Rest as much as possible and avoid heavy physical activity.",
                 "Monitor your symptoms closely (especially pain, bleeding, severe headache, or vision changes).",
                 "Keep your emergency contact and hospital number easily accessible.",
                 "If you notice any sudden worsening of symptoms, seek medical help immediately."
               ]
             when "warning"
               [
                 "Take regular short breaks during the day and avoid overexertion.",
                 "Drink enough water and eat small, frequent, balanced meals.",
                 "Keep a simple log of any unusual symptoms you notice.",
                 "Contact your doctor if anything feels worrying or does not improve."
               ]
             else # "normal" or unknown
               [
                 "Maintain a regular sleep schedule and rest when you feel tired.",
                 "Stay hydrated and follow your doctor’s advice on nutrition.",
                 "Keep track of your routine check-ups and attend all appointments.",
                 "If you notice new or worrying symptoms, contact your doctor promptly."
               ]
             end

      explanation = [
        "Here are some general self-care tips based on your current screening result:",
        "",
        *base,
        "",
        "These tips are for general support only and are NOT a diagnosis.",
        "Always follow the advice of your obstetrician or healthcare provider."
      ].join("\n")

      {
        "ai_enabled" => ai_enabled,
        "tips"       => explanation
      }
    end
  end
end
