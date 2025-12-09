# app/services/ai_diet_plan_service.rb
require "openai"

class AiDietPlanService
  MODEL_NAME = "gpt-4o-mini".freeze

  class << self
    def call(payload)
      api_key = ENV["OPENAI_API_KEY"]

      unless api_key.present?
        Rails.logger.warn("[AI DietPlan] No OPENAI_API_KEY set, using fallback.")
        return fallback_response(payload, ai_enabled: false, reason: "no_api_key")
      end

      client = build_client(api_key)
      prompt = build_prompt(payload)

      Rails.logger.info("[AI DietPlan] Calling OpenAI with model=#{MODEL_NAME}")

      response = client.chat(
        parameters: {
          model: MODEL_NAME,
          messages: [
            { role: "system", content: system_prompt },
            { role: "user",   content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 550
        }
      )

      content = dig_content(response)

      if content.blank?
        Rails.logger.warn("[AI DietPlan] Empty AI content, using fallback.")
        return fallback_response(payload, ai_enabled: false, reason: "empty_ai_content")
      end

      {
        "ai_enabled" => true,
        "diet_plan"  => content
      }
    rescue => e
      Rails.logger.error("[AI DietPlan] #{e.class}: #{e.message}")
      fallback_response(payload, ai_enabled: false, reason: "exception: #{e.class}")
    end

    private

    def build_client(api_key)
      OpenAI::Client.new(access_token: api_key) do |faraday|
        # dev-only workaround for macOS SSL issues
        faraday.ssl[:verify] = false if Rails.env.development?
      end
    end

    def system_prompt
      <<~SYS
        You are a gentle maternal wellness assistant.
        You create a **single-day diet plan** for a pregnant woman.

        Rules:
        - This is **not medical nutrition therapy**.
        - Assume a generally healthy pregnancy unless vitals suggest otherwise.
        - Always be conservative and safe: no raw meat/fish, unpasteurised cheese,
          alcohol, or obviously unsafe items in pregnancy.
        - Use simple household foods and normal portions.
        - Mention clearly that this is **general educational guidance** and
          that she must follow her obstetrician / dietician's advice first.
        - Keep tone warm, encouraging, and non-judgmental.
      SYS
    end

    def build_prompt(payload)
      cuisine   = payload["cuisine"] || "Indian"
      date      = payload["date"] || "today"
      patient   = payload["patient"] || {}
      reading   = payload["latest_reading"] || {}

      age       = patient["age"]
      weeks     = patient["gestational_weeks"]
      bmi       = patient["bmi"]

      maternal_hr  = reading["maternal_hr"]
      fetal_hr     = reading["fetal_hr"]
      sbp          = reading["systolic_bp"]
      dbp          = reading["diastolic_bp"]
      spo2         = reading["spo2"]
      temp         = reading["temperature"]

      <<~PROMPT
        Please create a **one-day diet plan** for a pregnant woman.

        Day: #{date}
        Preferred cuisine: #{cuisine}

        Patient info (if available):
        - Age: #{age.inspect}
        - Gestational weeks: #{weeks.inspect}
        - BMI (approx): #{bmi.inspect}

        Most recent vital signs (if available):
        - Maternal heart rate: #{maternal_hr.inspect}
        - Fetal heart rate: #{fetal_hr.inspect}
        - Blood pressure: #{sbp.inspect} / #{dbp.inspect}
        - SpO2: #{spo2.inspect}
        - Temperature: #{temp.inspect}

        Tasks:
        1. Suggest **meals and snacks** through the day, for example:
           - Early morning
           - Breakfast
           - Mid-morning snack
           - Lunch
           - Evening snack
           - Dinner
        2. Align flavours/choices with the chosen cuisine (#{cuisine}),
           but keep options light, balanced and pregnancy-friendly.
        3. For each item, explain in 1 short line **why** it is helpful
           (e.g., iron, protein, hydration, fibre).
        4. Avoid strong, absolute medical claims. No promises or cures.
        5. Add a short closing note reminding her that this is **not a
           personalised medical plan** and she should follow advice from
           her obstetrician or dietician first.

        Format your answer as:
        - A short friendly intro paragraph
        - Then a **markdown table** with columns:
          | Time | Meal / Item | Example foods | Why this helps |
        - Then a short closing paragraph with a gentle disclaimer.
      PROMPT
    end

    def dig_content(response)
      choice = response.dig("choices", 0)
      return nil unless choice

      message = choice["message"] || {}
      message["content"]
    end

    def fallback_response(payload, ai_enabled:, reason:)
      cuisine = payload["cuisine"] || "Indian"
      date    = payload["date"] || "today"

      explanation = <<~TEXT
        This is a general example of a gentle, pregnancy-friendly diet plan
        for #{date}, inspired by #{cuisine} flavours.

        • Breakfast: A small portion of whole grains (like oats or chapati),
          a serving of cooked vegetables, and a source of protein such as
          lentils, paneer, or eggs (if usually eaten).
        • Mid-morning: A fruit (like banana, apple, or orange) and a handful
          of nuts or seeds.
        • Lunch: A balanced plate with half vegetables/salad, one quarter
          whole grains (rice/roti), and one quarter protein (dal, beans,
          fish or lean meat if usually eaten), plus curd or buttermilk.
        • Evening snack: Something light such as boiled chana, sprouts
          chaat, or a small sandwich with vegetables.
        • Dinner: Similar to lunch but a little lighter, with more cooked
          vegetables and easy-to-digest foods.
        • Hydration: Small, frequent sips of water through the day; coconut
          water or lemon water if tolerated.

        This is only a **generic wellness example**. It does not replace the
        personalised advice of your obstetrician or a qualified dietician.
        Any special conditions like diabetes, high blood pressure, or
        anaemia must be managed strictly as per your doctor’s plan.
      TEXT

      {
        "ai_enabled" => ai_enabled,
        "reason"     => reason,
        "diet_plan"  => explanation
      }
    end
  end
end
