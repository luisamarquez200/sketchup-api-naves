if defined?($dashboard_timer) && $dashboard_timer
    UI.stop_timer($dashboard_timer)
    $dashboard_timer = nil
    UI.messagebox("⏹ Actualización automática detenida.")
    puts "🛑 Tiempo real detenido."
  else
    UI.messagebox("ℹ️ No hay ningún temporizador en ejecución.")
    puts "ℹ️ No hay temporizador activo."
  end  