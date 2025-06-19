require 'net/http'
require 'json'
require 'uri'

model = Sketchup.active_model

# 🎨 Materiales
verde = model.materials["VerdeEstado"] || model.materials.add("VerdeEstado")
verde.color = "green"

niquel = model.materials["NiquelEstado"] || model.materials.add("NiquelEstado")
niquel.color = Sketchup::Color.new(158, 160, 168)  # Gris níquel

# 🧭 Lista de cuadrantes
cuadrantes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']

cuadrantes.each do |letra|
  nombre_cuadrante = "Cuadrante #{letra}"
  encoded_nombre = nombre_cuadrante.gsub(' ', '%20')  # ✅ Corrige espacios

  url = URI.parse("http://64.23.225.99:3000/api/cuadrantes/#{encoded_nombre}")

  begin
    response = Net::HTTP.get_response(url)

    if response.is_a?(Net::HTTPSuccess)
      raw_body = response.body

      begin
        data = JSON.parse(raw_body)
      rescue => e
        puts "❌ Error al convertir JSON: #{e.message}"
        next
      end

      data.each do |item|
        nombre_raw = item["sub_ubicacion"]
        ocupada = item["ocupada"].to_i
        nombre = nombre_raw.to_s.strip.upcase

        definicion = model.definitions.find { |d| d.name.strip.upcase == nombre }

        if definicion.nil?
          next
        end

        color_aplicar = ocupada == 1 ? verde : niquel

        definicion.instances.each do |instancia|
          instancia.material = color_aplicar

          definicion.entities.each do |ent|
            if ent.is_a?(Sketchup::Group) || ent.is_a?(Sketchup::ComponentInstance)
              ent.definition.entities.each do |face|
                if face.is_a?(Sketchup::Face)
                  face.material = nil
                  face.back_material = nil
                end
              end
              ent.material = color_aplicar
            elsif ent.is_a?(Sketchup::Face)
              ent.material = nil
              ent.back_material = nil
            end
          end
        end
      end

    else
      puts "❌ Error HTTP #{response.code} - #{response.message} al consultar #{url}"
    end

  rescue => e
    puts "❌ Excepción al procesar #{nombre_cuadrante}: #{e.message}"
  end
end

