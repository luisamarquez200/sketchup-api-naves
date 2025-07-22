require 'sketchup'

# CAMBIAR ESTA RUTA a donde está tu carpeta de scripts
SCRIPTS_PATH = File.expand_path("/Users/luisafernandaescobarmarquez/Desktop/RUN/sketchup-api/SketchUpScripts")

def ejecutar_script(nombre_archivo)
  ruta = File.join(SCRIPTS_PATH, nombre_archivo)
  if File.exist?(ruta)
    load ruta
    puts "Ejecutado: #{nombre_archivo}"
  else
    UI.messagebox("No se encontró: #{ruta}")
  end
end

menu = UI.menu("Plugins").add_submenu("Dashboards")

menu.add_item("🏢 Dashboard Global") {
  ejecutar_script("scriptDashboard1.rb")
}
menu.add_item("📈 Dashboard por Clase (Vertical)") {
  ejecutar_script("scriptDashboard2.rb")
}
menu.add_item("📊 Dashboard por Clase (Horizontal)") {
  ejecutar_script("scriptDashboard3.rb")
}
menu.add_item("📅 Dashboard Semanal") {
  ejecutar_script("scriptDashboard4.rb")
}
menu.add_item("📅 Dashboard 18 Semanas") {
  ejecutar_script("scriptDashboard6.rb")
}

menu.add_separator
menu.add_item("⏱ Iniciar Tiempo Real (cada 5s)") {
  ejecutar_script("scriptTiempoRealControlado.rb")
}
menu.add_item("Detener Tiempo Real") {
  ejecutar_script("scriptDetenerTiempoReal.rb")
}
