model = Sketchup.active_model
view = model.active_view

cuadrantes = ['B', 'J', 'G', 'H']
DISTANCIA_ZOOM = 70000.0
$zoom_indice ||= 0
$zoom_activo = true

$mostrar_cuadrante = proc do
  begin
    if !$zoom_activo
      puts "🛑 Zoom desactivado. Se detiene ejecución."
      next
    end

    if $zoom_indice >= cuadrantes.size
      puts "🔁 Recorrido completado. Reiniciando desde el inicio..."
      $zoom_indice = 0
    end

    letra = cuadrantes[$zoom_indice]
    nombre_cuadrante = "Cuadrante #{letra}"

    cuadrante_def = model.definitions.find { |d| d.name.strip.upcase == nombre_cuadrante.strip.upcase }
    cuadrante_instancia = cuadrante_def&.instances&.find { |i| i.is_a?(Sketchup::ComponentInstance) }

    if cuadrante_instancia && cuadrante_instancia.valid?
      puts "👁️ Mostrando #{nombre_cuadrante}"

      bounds = cuadrante_instancia.bounds
      center = bounds.center

      eye = Geom::Point3d.new(center.x, center.y - DISTANCIA_ZOOM, center.z + DISTANCIA_ZOOM)
      eye = Geom::Point3d.new(center.x, center.y - 1500, center.z + 1500) if eye.distance(center) < 1.0

      camera = Sketchup::Camera.new(eye, center, [0, 0, 1])
      view.camera = camera
      view.refresh
    else
      puts "⚠️ No se encontró instancia válida para #{nombre_cuadrante}"
    end
  rescue => e
    puts "❌ Error al procesar #{nombre_cuadrante}: #{e.message}"
  ensure
    $zoom_indice += 1
    if !$zoom_activo
      puts "🛑 Zoom detenido. Ya no se continuará con el recorrido."
    end
  end
end