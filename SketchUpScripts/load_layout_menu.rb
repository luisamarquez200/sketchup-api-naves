require 'sketchup'
SCRIPTS_PATH = File.dirname(__FILE__)

# ✅ Función para cargar scripts desde carpeta
def ejecutar_script(nombre_archivo)
  ruta = File.join(SCRIPTS_PATH, nombre_archivo)
  if File.exist?(ruta)
    begin
      load ruta
      puts "✅ Ejecutado: #{nombre_archivo}"
    rescue => e
      UI.messagebox("❌ Error ejecutando #{nombre_archivo}:\n#{e.message}")
    end
  else
    UI.messagebox("❌ No se encontró el script: #{ruta}")
  end
end

# ✅ Crear menú Layout dentro de Plugins
menu = UI.menu("Plugins").add_submenu("Layout")

# 🚜 Montacargas
menu.add_item("🚜 Colores Montacargas") do
  ejecutar_script("scriptMontacargas.rb")
end

# 🔍 Zoom Cuadrantes
menu.add_separator

menu.add_item("▶️ Iniciar Zoom Cuadrantes Auto") do
  ejecutar_script("scriptZoom.rb") unless defined?($mostrar_cuadrante)
  if defined?($zoom_cuadrantes_timer) && $zoom_cuadrantes_timer
    puts "⚠️ Ya hay un temporizador activo."
  else
    puts "✅ Iniciando zoom automático..."
    $zoom_indice = 0
    $zoom_activo = true
    $zoom_cuadrantes_timer = UI.start_timer(5.0, true) { $mostrar_cuadrante.call }
  end
end

menu.add_item("⛔ Detener Zoom Cuadrantes Auto") do
  if defined?($zoom_cuadrantes_timer) && $zoom_cuadrantes_timer
    $zoom_cuadrantes_timer.stop if $zoom_cuadrantes_timer.respond_to?(:stop)
    $zoom_cuadrantes_timer = nil
    $zoom_activo = false
    puts "⛔ Zoom cuadrantes detenido correctamente"

    # 🔍 Aplicar zoom general en vista superior (planta)
    model = Sketchup.active_model
    view = model.active_view
    entidades_validas = model.entities.to_a.select(&:valid?)

    if entidades_validas.any?
      bounds = Geom::BoundingBox.new
      entidades_validas.each { |e| bounds.add(e.bounds) }

      center = bounds.center
      eye = Geom::Point3d.new(center.x, center.y, center.z + 150000.0) 
      target = center
      up = Geom::Vector3d.new(0, 1, 0) 

      camera = Sketchup::Camera.new(eye, target, up)
      view.camera = camera
      view.zoom(entidades_validas)
      view.refresh

      puts "📷 Vista general aplicada después de detener zoom."
    else
      puts "⚠️ No se encontraron entidades para mostrar en la vista general."
    end

  else
    puts "ℹ️ No hay temporizador activo."
  end
end

# ⏱ Tiempo Real
menu.add_separator
menu.add_item("⏱ Iniciar Tiempo Real (cada 5s)") do
  ejecutar_script("scriptTiempoRealControladoLayout.rb")
end

menu.add_item("🛑 Detener Tiempo Real") do
  ejecutar_script("scriptDetenerTiempoReal.rb")
end