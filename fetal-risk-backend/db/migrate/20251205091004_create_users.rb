class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :name
      t.string :email
      t.string :password_digest
      t.integer :age
      t.integer :gestation_weeks
      t.integer :gravida
      t.string :contact_number

      t.timestamps
    end
  end
end
