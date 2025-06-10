SCRIPTS_PATH = File.expand_path("/Users/luisafernandaescobarmarquez/Desktop/RUN/sketchup-api/SketchUpScripts")

def ejecutar_script(nombre_archivo)
  ruta = File.join(SCRIPTS_PATH, nombre_archivo)
  load ruta if File.exist?(ruta)
end

# 🚀 Ejecutar en tiempo real (cada 5 segundos)
UI.start_timer(5, true) do
  puts "⏱ Actualizando dashboards en tiempo real..."
  ejecutar_script("scriptDashboard1.rb")
  ejecutar_script("scriptDashboard2.rb")
  ejecutar_script("scriptDashboard3.rb")
  ejecutar_script("scriptDashboard4.rb")
  ejecutar_script("scriptMontacargas.rb")
end

UI.messagebox("🟢 Actualización automática activada (cada 5s)")
