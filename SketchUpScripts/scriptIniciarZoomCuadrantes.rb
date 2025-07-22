require 'sketchup'

SCRIPTS_PATH = File.dirname(__FILE__)
load File.join(SCRIPTS_PATH, "scriptZoom.rb")

if defined?($zoom_cuadrantes_timer) && $zoom_cuadrantes_timer
  puts "⚠️ Ya hay un temporizador activo."
else
  puts "✅ Iniciando recorrido automático por cuadrantes..."
  $zoom_indice = 0
  $zoom_cuadrantes_timer = UI.start_timer(10.0, true) do
    $mostrar_cuadrante.call if defined?($mostrar_cuadrante)
  end
end