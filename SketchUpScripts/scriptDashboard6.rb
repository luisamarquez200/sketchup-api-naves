require 'net/http'
require 'json'

model = Sketchup.active_model
entities = model.entities
materials = model.materials

# === PARÁMETROS DE CONFIGURACIÓN ===
altura_max = 10000.0
altura_minima = 100.0
y_base_visual = -19000.0

# Coordenadas por clase
coordenadas = {
  "Clase I" => { x: -818.93, z: 547.71, color: [180, 50, 180] },
  "Clase II" => { x: 7428.83, z: 547.71, color: [0, 180, 180] },
  "Clase III" => { x: 15212.99, z: 547.71, color: [255, 140, 100] }
}

# === CONSULTAR API ===
begin
  uri = URI('http://localhost:3000/api/dashboard/permanencia-18-semanas')
  response = Net::HTTP.get(uri)
  data = JSON.parse(response)
rescue => e
  puts "Error al obtener datos: #{e.message}"
  data = []
end

# === RESETEAR ALTURAS Y POSICIONES DE COMPONENTES ===
coordenadas.each_key do |clase|
  name = "BarraOcupada#{clase.gsub(" ", "")}"
  instancia = entities.grep(Sketchup::ComponentInstance).find { |c| c.name == name }
  next unless instancia

  matching = data.find { |d| d["clase"] == clase }
  porcentaje = matching ? matching["porcentaje"].to_f : 0.0

  nueva_altura = [(porcentaje / 100.0) * altura_max, altura_minima].max

  # Obtener altura original del componente
  bbox = instancia.definition.bounds
  altura_original = bbox.height
  escala_y = nueva_altura / altura_original

  # Posición final
  destino = Geom::Point3d.new(coordenadas[clase][:x], y_base_visual, coordenadas[clase][:z])

  # Escalar desde el centro del componente
  centro = bbox.center
  t_centro_neg = Geom::Transformation.translation(centro.vector_to(ORIGIN))
  t_escala = Geom::Transformation.scaling(ORIGIN, 1, escala_y, 1)
  t_centro_pos = Geom::Transformation.translation(ORIGIN.vector_to(centro))
  t_mover = Geom::Transformation.translation(destino)

  instancia.transformation = t_centro_neg * t_escala * t_centro_pos * t_mover

  # Aplicar color
  mat_name = "Color_#{name}"
  material = materials[mat_name] || materials.add(mat_name)
  material.color = Sketchup::Color.new(*coordenadas[clase][:color])
  instancia.material = material
end

# === ACTUALIZAR TEXTOS ===
coordenadas.each_key do |clase|
  texto_nombre = "BarraTexto#{clase.gsub(" ", "")}"
  matching = data.find { |d| d["clase"] == clase }
  cantidad = matching ? matching["cantidad_mayores_18"].to_i : 0
  porcentaje = matching ? matching["porcentaje"].to_f.round(2) : 0.0
  texto = "#{cantidad} (#{porcentaje} %)"

  definition = model.definitions[texto_nombre]
  next unless definition

  # Borrar texto anterior y agregar nuevo
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