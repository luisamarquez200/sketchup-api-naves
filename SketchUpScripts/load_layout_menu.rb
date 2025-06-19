require 'sketchup'

# ⚠️ CAMBIA ESTA RUTA a donde está tu carpeta de scripts
SCRIPTS_PATH = File.expand_path("/Users/luisafernandaescobarmarquez/Desktop/RUN/sketchup-api/SketchUpScripts")

def ejecutar_script(nombre_archivo)
  ruta = File.join(SCRIPTS_PATH, nombre_archivo)
  if File.exist?(ruta)
    load ruta
    puts "✅ Ejecutado: #{nombre_archivo}"
  else
    UI.messagebox("❌ No se encontró: #{ruta}")
  end
end

menu = UI.menu("Plugins").add_submenu("Layout")

menu.add_item("🚜 Colores Montacargas") {
  ejecutar_script("scriptMontacargas.rb")
}

menu.add_separator
menu.add_item("⏱ Iniciar Tiempo Real (cada 5s)") {
  ejecutar_script("scriptTiempoRealControladoLayout.rb")
}
menu.add_item("Detener Tiempo Real") {
  ejecutar_script("scriptDetenerTiempoReal.rb")
}
