require 'net/http'
require 'json'

model = Sketchup.active_model
entities = model.entities
definitions = model.definitions
materials = model.materials

uri = URI('http://64.23.225.99:3000/api/dashboard/ocupacion-por-clase')
response = Net::HTTP.get(uri)
data = JSON.parse(response)

referencias = {
  "Clase I" => "BarraClaseI",
  "Clase II" => "BarraClaseII",
  "Clase III" => "BarraClaseIII"
}

clases_mapeo = {
  "Clase I" => "BarraI",
  "Clase II" => "BarraII",
  "Clase III" => "BarraIII"
}

def ancho_base(nombre_componente)
  defn = Sketchup.active_model.definitions[nombre_componente]
  return defn.bounds.width if defn
  10000.0
end

ancho_max = ancho_max = ancho_base("BarraClaseI") * 2.5
altura_max = 400.0
profundidad = 1200.0

entities.grep(Sketchup::Group).select { |g| g.name.start_with?("BarraAzul_") }.each(&:erase!)

mat = materials["ColorAzulClase"] || materials.add("ColorAzulClase")
mat.color = Sketchup::Color.new(51, 102, 255)

data.each do |row|
  begin
    clase = row["clase"].to_s.strip

    next unless referencias.key?(clase)

    total = row["total"].to_i
    ocupadas = row["ocupadas"].to_i
    disponibles = total - ocupadas
    porcentaje = row["porcentaje_ocupacion"].to_f


    componente_nombre = referencias[clase]
    instancia = entities.find { |e| e.is_a?(Sketchup::ComponentInstance) && e.definition.name == componente_nombre }

    unless instancia
      next
    end

    origen = instancia.transformation.origin

    ancho = (porcentaje / 100.0) * ancho_max
    altura = (porcentaje / 100.0) * altura_max

    barra = entities.add_group
    cara = barra.entities.add_face(
      [0, 0, 0],
      [ancho, 0, 0],
      [ancho, profundidad, 0],
      [0, profundidad, 0]
    )
    cara.reverse! if cara.normal.z < 0
    cara.pushpull(altura)
    barra.transform!(Geom::Transformation.translation([origen.x, origen.y, origen.z]))
    barra.name = "BarraAzul_#{clase}"
    barra.material = mat
    barra.entities.each { |e| e.material = mat if e.respond_to?(:material=) }


    clave = case clase
            when "Clase I" then "BarraI"
            when "Clase II" then "BarraII"
            when "Clase III" then "BarraIII"
            else next
            end

    textos = {
      "Cantidad#{clave}" => total.to_s,
      "Disponibilidad#{clave}" => disponibles.to_s,
      "Porcentaje#{clave}" => "#{porcentaje.round(2)} %"
    }

    textos.each do |nombre, texto|
      defn = definitions[nombre]
      if defn.nil?
        next
      end

      defn.entities.clear!
      defn.entities.add_3d_text(
  texto,
  TextAlignLeft,
  "Arial Black", false, false,
  1.5, 0.0, 3.0, false, 0.0
)

    end
  rescue => e
    puts "❌ Error procesando clase #{row["clase"]}: #{e.message}"
  end
end