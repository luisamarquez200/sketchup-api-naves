require 'net/http'
require 'json'

model = Sketchup.active_model
entities = model.entities
materials = model.materials

# Obtener datos de la API
begin
  uri = URI('http://64.23.225.99:3000/api/dashboard/ocupacion-global')
  response = Net::HTTP.get(uri)
  data = JSON.parse(response)
rescue => e
  data = {
    "total" => 0,
    "ocupadas" => "0",
    "libres" => "0",
    "porcentaje_ocupado" => 0.0,
    "porcentaje_libre" => 0.0
  }
end

# Parámetros visuales
altura_max = 10000.0          # altura máxima en mm
anchura = 600.0 * 4          # ancho aumentado ×3
profundidad = 600.0 * 1      # profundidad aumentado ×3
y_base_visual = 19400.0      # posición base común en eje Y

# Eliminar barras anteriores si existen
["BarraOcupada", "BarraLibres"].each do |nombre|
  entities.grep(Sketchup::Group).select { |g| g.name == nombre }.each(&:erase!)
end

# Datos para cada barra
barras = {
  "BarraOcupada" => {
    porcentaje: data["porcentaje_ocupado"].to_f,
    color: [255, 102, 77],
    x: -72700.88,
    z: 2366.91
  },
  "BarraLibres" => {
    porcentaje: data["porcentaje_libre"].to_f,
    color: [51, 102, 255],
    x: -64669.27,
    z: 2366.91
  }
}

# Crear barras
barras.each do |nombre, info|
  porcentaje = info[:porcentaje]
  altura = [(porcentaje / 100.0) * altura_max, 100.0].max
  x, z = info[:x], info[:z]

  group = entities.add_group

  # Crear base en el origen
  pts = [
    [0, 0, 0],
    [anchura, 0, 0],
    [anchura, 0, profundidad],
    [0, 0, profundidad]
  ]
  base = group.entities.add_face(pts)
  base.reverse! if base.normal.z < 0
  base.pushpull(-altura)  # extruye hacia Y-

  # Mover grupo a la base visual
  group.transform!(Geom::Transformation.translation([x, y_base_visual, z]))

  group.name = nombre

  # Aplicar color
  mat_name = "Color_#{nombre}"
  material = materials[mat_name] || materials.add(mat_name)
  material.color = Sketchup::Color.new(*info[:color])
  group.material = material
  group.entities.each { |e| e.material = material if e.respond_to?(:material=) }
end

# Texto dinámico en componentes
total = data['total'].to_i
ocupadas = data['ocupadas'].to_i
libres = data['libres'].to_i
porcentaje_ocupado = "#{data['porcentaje_ocupado'].to_f.round(2)}"
porcentaje_libre = "#{data['porcentaje_libre'].to_f.round(2)}"

text_items = {
  "TextoTotal" => "#{total}",
  "TextoOcupadas" => "#{ocupadas}",
  "TextoLibres" => "#{libres}",
  "TextoPorcentajeOcupadas" => "#{porcentaje_ocupado} %",
  "TextoPorcentajeLibres" => "#{porcentaje_libre} %"
}

text_items.each do |component_name, new_text|
  definition = model.definitions[component_name]
  next unless definition

  instance = entities.find { |e| e.is_a?(Sketchup::ComponentInstance) && e.definition == definition }
  scale_factor = instance ? instance.transformation.to_a[0] : 1.0

  definition.entities.clear!
  definition.entities.add_3d_text(
  new_text,
  TextAlignLeft,
  "Arial Black",
  false, false,
  1.8, 0.0, 1.0,
  false, 0.0
)
end