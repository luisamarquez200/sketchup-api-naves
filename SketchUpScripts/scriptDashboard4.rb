require 'net/http'
require 'json'

model = Sketchup.active_model
entities = model.entities
materials = model.materials
definitions = model.definitions

# 1. API: Entradas y salidas por semana
begin
  uri = URI('http://localhost:3000/api/dashboard/ocupacion-semanal')
  response = Net::HTTP.get(uri)
  data = JSON.parse(response)
rescue => e
  data = []
end

# 2. Parámetros
altura_max = 3000.0

# 3. Mapeo de nombres → posiciones existentes (obtenidas previamente)
componentes = {
  "Semana1E" => [8264.53, -10983.35],
  "Semana1S" => [9088.54, -10983.35],
  "Semana2E" => [11652.4, -10983.35],
  "Semana2S" => [12476.41, -10983.35],
  "Semana3E" => [15426.41, -10983.35],
  "Semana3S" => [16250.42, -10983.35],
  "Semana4E" => [19119.91, -10983.35],
  "Semana4S" => [19943.92, -10983.35]
}

# 4. Eliminar componentes anteriores
entities.grep(Sketchup::ComponentInstance).each do |instancia|
  if componentes.key?(instancia.name)
    instancia.erase!
  end
end

# 5. Crear nuevas barras basadas en API
max_valor = data.map { |d| [d['entradas'].to_i, d['salidas'].to_i].max }.max.to_f

data.each_with_index do |row, index|
  semana = 4 - index
  next if semana < 1 || semana > 4

  { "E" => "entradas", "S" => "salidas" }.each do |sufijo, tipo|
    cantidad = row[tipo].to_i
    porcentaje = max_valor > 0 ? (cantidad / max_valor) * 100 : 0
    altura = (porcentaje / 100.0) * altura_max
    nombre = "Semana#{semana}#{sufijo}"

    x, y = componentes[nombre]
    z = 0

    grupo = entities.add_group
    cara = grupo.entities.add_face(
      [0, 0, 0],
      [600, 0, 0],
      [600, 600, 0],
      [0, 600, 0]
    )
    cara.reverse! if cara.normal.z < 0
    cara.pushpull(altura)

    grupo.transform!(Geom::Transformation.translation([x, y, z]))
    grupo.name = nombre

    color = tipo == "entradas" ? [192, 192, 192] : [0, 0, 255]
    mat_name = "Color_#{nombre}"
    material = materials[mat_name] || materials.add(mat_name)
    material.color = Sketchup::Color.new(*color)
    grupo.material = material
    grupo.entities.each { |e| e.material = material if e.respond_to?(:material=) }

    # Texto encima de la barra
    texto_group = entities.add_group
    defn_txt = model.definitions.add("Texto_#{nombre}")
    defn_txt.entities.add_3d_text(
      cantidad.to_s,
      TextAlignCenter, "Arial Black", false, false,
      1.2, 0.0, 1.0, false, 0.0
    )
    texto_group.name = "Texto_#{nombre}"
    texto_group.entities.add_instance(defn_txt, Geom::Transformation.translation([x + 150, y + 700, altura + 100]))
  end
end