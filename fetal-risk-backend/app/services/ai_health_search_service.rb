# app/services/ai_health_search_service.rb
# General AI Q&A about pregnancy / maternal–fetal health.
# Uses OpenAI via ruby-openai, with a safe fallback.

require "openai"

class AiHealthSearchService
  MODEL_NAME = "gpt-4o-mini".freeze

  class << self
    def call(question)
      question = question.to_s.strip

      if question.blank?
        return {
          "ai_enabled" => false,
          "answer"     => "Please enter a question so I can try to help."
        }
      end

      api_key = ENV["OPENAI_API_KEY"]

      unless api_key.present?
        Rails.logger.warn("[AI Health] No OPENAI_API_KEY set, using fallback.")
        return fallback_response(
          "No API key configured yet. Please try again later."
        )
      end

      client = build_client(api_key)

      Rails.logger.info("[AI Health] Calling OpenAI with model=#{MODEL_NAME}")

      response = client.chat(
        parameters: {
          model: MODEL_NAME,              # 🔴 MUST include model
          messages: [
            { role: "system", content: system_prompt },
            { role: "user",   content: question }
          ],
          temperature: 0.4,
          max_tokens: 400
        }
      )

      content = dig_content(response)

      if content.blank?
        Rails.logger.warn("[AI Health] Empty AI content, using fallback.")
        return fallback_response(
          "I couldn't generate an answer right now. Please try again later."
        )
      end

      {
        "ai_enabled" => true,
        "answer"     => content
      }
    rescue => e
      Rails.logger.error("[AI Health] #{e.class}: #{e.message}")
      fallback_response(
        "I'm having trouble reaching the AI service right now. " \
        "Please try again later or ask your doctor directly."
      )
    end

    private

    # Same SSL workaround as AiExplanationService
    def build_client(api_key)
      OpenAI::Client.new(access_token: api_key) do |faraday|
        faraday.ssl[:verify] = false if Rails.env.development?
      end
    end

    def system_prompt
      <<~SYS
        You are an assistant that answers general questions about pregnancy,
        maternal health, and fetal health. Your answers must:

        - Be short, clear, and calm
        - Be educational only, not a diagnosis
        - Encourage the user to talk to their doctor for any worrying symptoms
        - Avoid giving specific treatment plans, prescriptions, or emergencies advice
        - Always say that this does NOT replace a real doctor

        If the question sounds like an emergency (severe pain, heavy bleeding,
        loss of consciousness, etc.), tell them to seek immediate medical care.
      SYS
    end

    def dig_content(response)
      choice  = response.dig("choices", 0)
      message = choice && choice["message"]
      message && message["content"]
    end

    def fallback_response(message)
      {
        "ai_enabled" => false,
        "answer"     =>
          "Sorry, I couldn't fetch a live AI answer right now.\n\n" \
          "#{message}"
      }
    end
  end
end
