Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Auth
      post 'register', to: 'auth#register'
      post 'login',    to: 'auth#login'
      get  'me',       to: 'auth#me'

      # Existing resources
      resources :patients, only: [:index, :show, :create, :update] do
        resources :readings, only: [:index, :create]
        get 'current_risk', to: 'risk#current'
        get 'risk_history', to: 'risk#history'
      end

      post 'patients/:patient_id/simulate_reading', to: 'simulation#create'
    end
  end
end
