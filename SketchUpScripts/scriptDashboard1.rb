require 'net/http'
require 'json'

model = Sketchup.active_model
entities = model.entities
materials = model.materials

begin
  uri = URI('http://localhost:3000/api/dashboard/ocupacion-global')
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

altura_max = 3000.0          # altura máxima en mm
anchura = 600.0 * 3          # ancho aumentado ×4
profundidad = 600.0 * 3      # profundidad aumentada ×4

["BarraOcupada", "BarraLibres"].each do |nombre|
  entities.grep(Sketchup::Group).select { |g| g.name == nombre }.each(&:erase!)
end

barras = {
  "BarraOcupada" => {
    porcentaje: data["porcentaje_ocupado"].to_f,
    color: [255, 102, 77],
    x: 11092.71,
    y: 30388.58
  },
  "BarraLibres" => {
    porcentaje: data["porcentaje_libre"].to_f,
    color: [51, 102, 255],
    x: 15315.96,
    y: 30388.58
  }
}

barras.each do |nombre, info|
  porcentaje = info[:porcentaje]
  altura = (porcentaje / 100.0) * altura_max
  x, y = info[:x], info[:y]

  group = entities.add_group
  pts = [
    [0, 0, 0],
    [anchura, 0, 0],
    [anchura, profundidad, 0],
    [0, profundidad, 0]
  ]
  base = group.entities.add_face(pts)
  base.reverse! if base.normal.z < 0
  base.pushpull(altura)

  group.transform!(Geom::Transformation.translation([x, y, 0]))
  group.name = nombre

  mat_name = "Color_#{nombre}"
  material = materials[mat_name] || materials.add(mat_name)
  material.color = Sketchup::Color.new(*info[:color])
  group.material = material
  group.entities.each { |e| e.material = material if e.respond_to?(:material=) }

end

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
    1.0, 0.0, 0.2,
    false, 0.0
  )

end