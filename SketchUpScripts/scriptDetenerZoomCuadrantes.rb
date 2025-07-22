if defined?($zoom_cuadrantes_timer) && $zoom_cuadrantes_timer
  $zoom_cuadrantes_timer.stop if $zoom_cuadrantes_timer.respond_to?(:stop)
  $zoom_cuadrantes_timer = nil
  puts "⛔ Zoom cuadrantes detenido correctamente"
else
  puts "ℹ️ No hay temporizador activo."
end