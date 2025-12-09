# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Auth
      post "register", to: "auth#register"
      post "login",    to: "auth#login"
      get  "me",       to: "auth#me"

      # Patients + nested resources
      resources :patients, only: %i[index show create update] do
        resources :readings, only: %i[index create]

        # Risk endpoints
        get "current_risk",  to: "risk#current"
        get "risk_history",  to: "risk#history"
        get "risk_forecast", to: "risk_forecasts#show"

        # PDF report
        get :report, to: "reports#show"

        # ⭐ AI Pattern Explorer (POST /api/v1/patients/:patient_id/ai_patterns)
        post :ai_patterns, to: "ai_patterns#create"
      end

      # Simulation for generating demo readings
      post "patients/:patient_id/simulate_reading", to: "simulation#create"

      # ⭐ AI Explain-My-Risk
      post "explain", to: "explain#create"

      # ⭐ AI Health Search (chat-like Q&A)
      post "ai_health_search", to: "ai_health_search#create"

      # ⭐ AI Care Coach
      post "ai/care_coach", to: "ai_care_coach#create"
      post "ai/diet_plan",     to: "ai_diet_plan#create"

    end
  end
end
