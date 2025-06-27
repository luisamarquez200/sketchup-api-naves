require 'net/http'
require 'json'

model = Sketchup.active_model
entities = model.entities
materials = model.materials

# === PARÁMETROS DE CONFIGURACIÓN ===
altura_max = 5000.0
altura_minima = 100.0
y_base_visual = -6900.0

# Coordenadas por clase
coordenadas = {
  "Clase I" => { x: -818.93, z: 547.71, color: [180, 50, 180] },
  "Clase II" => { x: 7428.83, z: 547.71, color: [0, 180, 180] },
  "Clase III" => { x: 15212.99, z: 547.71, color: [255, 140, 100] }
}

begin
  uri = URI('http://64.23.225.99:3000/api/dashboard/permanencia-18-semanas')
  response = Net::HTTP.get(uri)
  data = JSON.parse(response)
rescue => e
  puts "Error al obtener datos: #{e.message}"
  data = []
end

coordenadas.each_key do |clase|
  name = "BarraOcupada#{clase.gsub(" ", "")}"
  instancia = entities.grep(Sketchup::ComponentInstance).find { |c| c.name == name }
  next unless instancia

  matching = data.find { |d| d["clase"] == clase }
  porcentaje = matching ? matching["porcentaje"].to_f : 0.0
  nueva_altura = [(porcentaje / 100.0) * altura_max, altura_minima].max

  # ALTURA ACTUAL YA TRANSFORMADA
  bbox = instancia.bounds
  altura_actual = bbox.height
  base_actual = bbox.min

  escala_y = nueva_altura / altura_actual

  puts "Clase: #{clase} | Porcentaje: #{porcentaje} | Altura actual: #{altura_actual} | Escala Y: #{escala_y}"

  # Escalar desde la base
  t1 = Geom::Transformation.translation(base_actual.vector_to(ORIGIN))
  t2 = Geom::Transformation.scaling(ORIGIN, 1, escala_y, 1)
  t3 = Geom::Transformation.translation(ORIGIN.vector_to(base_actual))
  instancia.transform!(t1 * t2 * t3)

  # Ajustar altura base a y_base_visual
  nueva_base = instancia.bounds.min
  delta_y = y_base_visual - nueva_base.y
  instancia.transform!(Geom::Transformation.translation([0, delta_y, 0]))

  # Aplicar color
  mat_name = "Color_#{name}"
  material = materials[mat_name] || materials.add(mat_name)
  material.color = Sketchup::Color.new(*coordenadas[clase][:color])
  instancia.material = material
end

coordenadas.each_key do |clase|
  texto_nombre = "BarraTexto#{clase.gsub(" ", "")}"
  matching = data.find { |d| d["clase"] == clase }
  cantidad = matching ? matching["cantidad_mayores_18"].to_i : 0
  porcentaje = matching ? matching["porcentaje"].to_f.round(2) : 0.0
  texto = "#{cantidad} (#{porcentaje} %)"

  definition = model.definitions[texto_nombre]
  next unless definition

  definition.entities.clear!
  definition.entities.add_3d_text(
    texto,
    TextAlignLeft,
    "Arial Black",
    false, false,
    1.8, 0.0, 1.0,
    false, 0.0
  )
end