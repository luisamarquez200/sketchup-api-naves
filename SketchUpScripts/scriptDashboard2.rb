require 'net/http'
require 'json'

model = Sketchup.active_model
entities = model.entities
materials = model.materials

# 1. API: obtener datos de ocupación por clase
uri = URI('http://64.23.225.99:3000/api/dashboard/ocupacion-por-clase')
response = Net::HTTP.get(uri)
data = JSON.parse(response)

# 2. Filtrar solo Clases I, II y III
clases_objetivo = ["Clase I", "Clase II", "Clase III"]
clases = data.select { |d| clases_objetivo.include?(d["clase"]) }

# 3. Parámetros del círculo
centro = [0, 0, 0]
radio = 3000.0
segmentos = 72  # Cuantos más, más suave
angulo_total = 0.0

# 4. Colores asignados
colores = {
  "Clase I" => [255, 0, 0],      # rojo
  "Clase II" => [0, 255, 255],   # cian
  "Clase III" => [255, 255, 0]   # amarillo
}

# 5. Eliminar cualquier geometría anterior con nombre conocido
["Sector_Clase I", "Sector_Clase II", "Sector_Clase III"].each do |nombre|
  entities.grep(Sketchup::Group).select { |g| g.name == nombre }.each(&:erase!)
end

# 6. Calcular ángulos proporcionales y dibujar sectores
clases.each do |clase_data|
  clase = clase_data["clase"]
  porcentaje = clase_data["porcentaje_ocupacion"].to_f
  angulo = 360.0 * (porcentaje / 100.0)

  pasos = ((segmentos * angulo) / 360.0).round
  angulo_rad = angulo * Math::PI / 180.0
  inicio = angulo_total * Math::PI / 180.0

  puntos = [centro]
  pasos.times do |i|
    a = inicio + (i.to_f / pasos.to_f) * angulo_rad
    puntos << [
      centro[0] + Math.cos(a) * radio,
      centro[1] + Math.sin(a) * radio,
      0
    ]
  end

  group = entities.add_group
  face = group.entities.add_face(puntos)
  face.reverse! if face.normal.z < 0
  group.name = "Sector_#{clase}"

  # Aplicar color
  color = colores[clase]
  mat = materials["Color_#{clase}"] || materials.add("Color_#{clase}")
  mat.color = Sketchup::Color.new(*color)
  group.material = mat
  group.entities.each { |e| e.material = mat if e.respond_to?(:material=) }

  # Texto de porcentaje en el centro del sector
  angulo_mitad = inicio + (angulo_rad / 2.0)
  texto_x = centro[0] + Math.cos(angulo_mitad) * (radio * 0.5)
  texto_y = centro[1] + Math.sin(angulo_mitad) * (radio * 0.5)

  texto_group = entities.add_group
  texto_group.name = "Texto_#{clase}"
  texto_group.entities.add_3d_text(
    "#{porcentaje.round(2)} %",
    TextAlignCenter, "Arial Black",
    false, false,
    2.0, 0.0, 1.0,
    false, 0.0
  )
  texto_group.transform!(Geom::Transformation.translation([texto_x, texto_y, 0]))

  angulo_total += angulo
end