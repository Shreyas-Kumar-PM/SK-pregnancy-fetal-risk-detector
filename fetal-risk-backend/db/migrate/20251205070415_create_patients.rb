class CreatePatients < ActiveRecord::Migration[8.1]
  def change
    create_table :patients do |t|
      t.string :name
      t.integer :age
      t.integer :gestation_weeks
      t.integer :gravida
      t.string :contact_number
      t.string :email

      t.timestamps
    end
  end
end
