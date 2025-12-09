# app/services/ai_patterns_service.rb
require "openai"

class AiPatternsService
  MODEL_NAME = "gpt-4o-mini".freeze

  class << self
    # Public entrypoint
    # patient: Patient ActiveRecord object
    # readings: ActiveRecord::Relation (patient.readings)
    # risks: ActiveRecord::Relation (patient.risk_evaluations)
    def call(patient:, readings:, risks:)
      api_key = ENV["OPENAI_API_KEY"]

      unless api_key.present?
        Rails.logger.warn("[AI Patterns] No OPENAI_API_KEY set, using fallback")
        return fallback_response(ai_enabled: false, reason: "no_api_key")
      end

      client = build_client(api_key)
      prompt = build_prompt(patient, readings, risks)

      Rails.logger.info("[AI Patterns] Calling OpenAI with model=#{MODEL_NAME}")

      response = client.chat(
        parameters: {
          model: MODEL_NAME,
          messages: [
            { role: "system", content: system_prompt },
            { role: "user",   content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 600
        }
      )

      content = dig_content(response)

      if content.blank?
        Rails.logger.warn("[AI Patterns] Empty AI content, using fallback")
        return fallback_response(ai_enabled: false, reason: "empty_ai_content")
      end

      {
        "ai_enabled" => true,
        "summary"    => content
      }
    rescue => e
      Rails.logger.error("[AI Patterns] #{e.class}: #{e.message}")
      fallback_response(ai_enabled: false, reason: "exception: #{e.class}")
    end

    private

    # Same SSL workaround pattern as your AiExplanationService
    def build_client(api_key)
      OpenAI::Client.new(access_token: api_key) do |faraday|
        if Rails.env.development?
          faraday.ssl[:verify] = false  # dev-only workaround
        end
      end
    end

    def system_prompt
      <<~SYS
        You are an assistant that analyzes time-series maternal–fetal vitals
        and risk scores. Your goal is to explain patterns and trends in simple,
        friendly language for clinicians and patients.

        You DO NOT give diagnoses. You only describe trends, possible reasons,
        and suggest when closer monitoring or a doctor's review might be helpful.
      SYS
    end

    def build_prompt(patient, readings, risks)
      # Only use the most recent points to avoid huge prompts
      recent_readings = readings.order(recorded_at: :desc).limit(40)
      recent_risks    = risks.order(created_at: :desc).limit(40)

      readings_payload = recent_readings.map do |r|
        {
          recorded_at: r.recorded_at,
          fetal_hr:    r.fetal_hr,
          maternal_hr: r.maternal_hr,
          systolic_bp: r.systolic_bp,
          diastolic_bp:r.diastolic_bp,
          spo2:        r.spo2,
          temperature: r.temperature
        }
      end

      risks_payload = recent_risks.map do |re|
        {
          created_at: re.created_at,
          risk_level: re.risk_level,
          risk_score: re.risk_score,
          reason:     re.reason
        }
      end

      patient_bits = []
      patient_bits << "Age: #{patient.age}" if patient.respond_to?(:age) && patient.age.present?
      if patient.respond_to?(:gestational_age_weeks) && patient.gestational_age_weeks.present?
        patient_bits << "Gestational age: #{patient.gestational_age_weeks} weeks"
      end

      <<~PROMPT
        We have a pregnant patient with the following context:
        #{patient_bits.join(", ") if patient_bits.any?}

        Below are up to 40 recent vital readings (most recent first):
        #{readings_payload.to_json}

        And up to 40 recent risk evaluations:
        #{risks_payload.to_json}

        Please:
        - Describe any clear patterns or trends (e.g., consistently high BP, spikes in HR, stable vitals, etc.).
        - Highlight periods where risk level went from normal → warning → critical (or vice versa).
        - Comment on whether things appear to be stabilizing, improving, or worsening.
        - Suggest gentle, non-alarming guidance such as “mention this pattern at your next visit”
          or “contact your doctor sooner if symptoms appear”.
        - Keep the answer in 2–4 short paragraphs, plain language, no medical jargon.
      PROMPT
    end

    def dig_content(response)
      choice = response.dig("choices", 0)
      return nil unless choice

      message = choice["message"] || {}
      message["content"]
    end

    def fallback_response(ai_enabled:, reason:)
      explanation = <<~TEXT
        Based on the available history, this tool could not generate an
        AI summary right now (reason: #{reason}).

        You can still review the vitals and risk history manually in the
        dashboard. Look for:
        - Any repeated high blood pressure readings,
        - Persistent abnormal heart rates,
        - Frequent transitions into warning or critical risk levels.

        If you notice worrying trends or new symptoms, please contact a
        qualified healthcare provider for advice.
      TEXT

      {
        "ai_enabled" => ai_enabled,
        "summary"    => explanation
      }
    end
  end
end
