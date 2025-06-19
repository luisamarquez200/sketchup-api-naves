SCRIPTS_PATH = File.expand_path("/Users/luisafernandaescobarmarquez/Desktop/RUN/sketchup-api/SketchUpScripts")

def ejecutar_script(nombre_archivo)
  ruta = File.join(SCRIPTS_PATH, nombre_archivo)
  if File.exist?(ruta)
    load ruta
    puts "Ejecutado: #{nombre_archivo}"
  else
    puts "Archivo no encontrado: #{ruta}"
  end
end

# Detener si ya está corriendo
if $dashboard_timer
  puts "Ya hay un temporizador activo. No se iniciará otro."
else
  puts "Activando actualización automática de dashboards cada 5 segundos..."
  $dashboard_timer = UI.start_timer(5, true) do
    ejecutar_script("scriptMontacargas.rb")
    puts "🔄 Datos actualizados #{Time.now.strftime('%H:%M:%S')}"
  end
end
