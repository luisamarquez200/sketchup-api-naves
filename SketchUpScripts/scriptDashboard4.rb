require 'net/http'
require 'json'

model = Sketchup.active_model
entities = model.entities
materials = model.materials

# Obtener datos desde API
begin
  uri = URI('http://64.23.225.99:3000/api/dashboard/ocupacion-semanal')
  response = Net::HTTP.get(uri)
  data = JSON.parse(response)
rescue => e
  data = []
end

# Coordenadas de cada barra (x, y)
componentes = {
  "Semana1E" => [-40187.31, -7088.36],
  "Semana1S" => [-38621.69, -7088.36],
  "Semana2E" => [-33750.36, -7088.36],
  "Semana2S" => [-32184.74, -7088.36],
  "Semana3E" => [-26579.74, -7088.36],
  "Semana3S" => [-25014.12, -7088.36],
  "Semana4E" => [-19562.09, -7088.36],
  "Semana4S" => [-17996.47, -7088.36]
}

# Parámetros visuales
altura_max = 3000.0
ancho = 1000.0
profundidad = 200.0
z_base = 0.0

# Limpiar anteriores
componentes.keys.each do |nombre|
  entities.grep(Sketchup::Group).select { |g| g.name == nombre }.each(&:erase!)
  entities.grep(Sketchup::Group).select { |g| g.name == "Texto_#{nombre}" }.each(&:erase!)
end

# Escala según valor máximo
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

    # Crear barra
    group = entities.add_group
    pts = [
      [0, 0, 0],
      [ancho, 0, 0],
      [ancho, 0, profundidad],
      [0, 0, profundidad]
    ]
    face = group.entities.add_face(pts)
    face.reverse! if face.normal.z < 0
    face.pushpull(-altura)
    group.transform!(Geom::Transformation.translation([x, y, z_base]))
    group.name = nombre

    # Aplicar color
    color = tipo == "entradas" ? [192, 192, 192] : [0, 0, 255]
    mat = materials["Color_#{nombre}"] || materials.add("Color_#{nombre}")
    mat.color = Sketchup::Color.new(*color)
    group.material = mat
    group.entities.each { |e| e.material = mat if e.respond_to?(:material=) }

    # Crear texto encima de la barra
    texto_group = entities.add_group
    texto_group.name = "Texto_#{nombre}"

    texto_face = texto_group.entities.add_3d_text(
      cantidad.to_s,
      TextAlignCenter,
      "Arial Black",
      false, false,
      3.5, 0.0, 1.0,
      false, 0.0
    )

    # Aplicar color negro al texto
    mat_texto = materials["ColorTexto_#{nombre}"] || materials.add("ColorTexto_#{nombre}")
    mat_texto.color = Sketchup::Color.new(0, 0, 0)
    texto_group.material = mat_texto
    texto_group.entities.each { |e| e.material = mat_texto if e.respond_to?(:material=) }

    # Alinear el texto centrado en la barra
    bounds = texto_group.bounds
    offset_x = (ancho / 2.0) - (bounds.width / 2.0)
    offset_y = 300.0    # Separación hacia adelante
    offset_z = 400.0    # Separación hacia arriba

    texto_group.transform!(
      Geom::Transformation.translation([
        x + offset_x,
        y + offset_y,
        z_base + offset_z
      ])
    )
  end
end
