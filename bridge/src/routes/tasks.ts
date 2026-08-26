import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface TaskItem {
  id: number;
  phone: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

/**
 * Tasks Router — Persistent Mini CRUD for WhatsApp Bot
 */
export function createTasksRouter(authDir: string): Router {
  const router = Router();
  const tasksFilePath = path.join(authDir, 'tasks.json');

  const loadTasks = (): TaskItem[] => {
    try {
      if (fs.existsSync(tasksFilePath)) {
        const raw = fs.readFileSync(tasksFilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      // Return empty array on error
    }
    return [];
  };

  const saveTasks = (tasks: TaskItem[]): void => {
    try {
      fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2), 'utf-8');
    } catch (err) {
      // Ignore write errors
    }
  };

  /**
   * GET /tasks/:phone — Get all tasks for a specific phone number
   */
  router.get('/:phone', (req: Request, res: Response) => {
    const phone = req.params.phone;
    const allTasks = loadTasks();
    const userTasks = allTasks.filter(t => t.phone === phone);
    res.json({ success: true, tasks: userTasks });
  });

  /**
   * POST /tasks/action — Execute CRUD actions (add, complete, delete, clear, list)
   */
  router.post('/action', (req: Request, res: Response) => {
    const { phone, action, text, index } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'phone is required' });
    }

    let allTasks = loadTasks();
    let userTasks = allTasks.filter(t => t.phone === phone);
    let alertMsg = '';

    if (action === 'add') {
      if (text && text.trim()) {
        const newTask: TaskItem = {
          id: Date.now(),
          phone,
          text: text.trim(),
          completed: false,
          createdAt: new Date().toISOString(),
        };
        allTasks.push(newTask);
        userTasks.push(newTask);
        saveTasks(allTasks);
        alertMsg = `✅ ¡Tarea agregada con éxito!\n👉 "*${newTask.text}*"`;
      } else {
        alertMsg = `⚠️ Para agregar una tarea escribe: *4a [nombre de la tarea]* (ej: *4a Comprar pan*)`;
      }
    } else if (action === 'complete') {
      const idx = parseInt(index, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < userTasks.length) {
        userTasks[idx].completed = !userTasks[idx].completed;
        saveTasks(allTasks);
        alertMsg = userTasks[idx].completed
          ? `🎉 ¡Tarea #${index} completada!\n👉 ~${userTasks[idx].text}~`
          : `⏳ Tarea #${index} marcada como pendiente:\n👉 ${userTasks[idx].text}`;
      } else {
        alertMsg = `⚠️ No se encontró la tarea #${index || '?'}.`;
      }
    } else if (action === 'delete') {
      const idx = parseInt(index, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < userTasks.length) {
        const removed = userTasks[idx];
        allTasks = allTasks.filter(t => t.id !== removed.id);
        userTasks.splice(idx, 1);
        saveTasks(allTasks);
        alertMsg = `🗑️ Tarea #${index} eliminada:\n👉 "*${removed.text}*"`;
      } else {
        alertMsg = `⚠️ No se encontró la tarea #${index || '?'}.`;
      }
    } else if (action === 'clear') {
      allTasks = allTasks.filter(t => t.phone !== phone);
      userTasks = [];
      saveTasks(allTasks);
      alertMsg = `🧹 Todas tus tareas han sido eliminadas.`;
    }

    // Build user-facing formatted list
    let listFormatted = '';
    if (userTasks.length === 0) {
      listFormatted = `_(Actualmente no tienes tareas en tu lista)_`;
    } else {
      listFormatted = userTasks
        .map((t, i) => `${t.completed ? '✅' : '📌'} *${i + 1}.* ${t.completed ? `~${t.text}~` : t.text}`)
        .join('\n');
    }

    const fullResponse = `${alertMsg ? `${alertMsg}\n\n` : ''}📝 *Gestor de Tareas (TODO):*\n\n${listFormatted}\n\n────────────────\n👉 *Opciones interactivas:*\n➕ *4a [tarea]* ➔ Agregar (ej: *4a Comprar pan*)\n✅ *4b [número]* ➔ Completar (ej: *4b 1*)\n🗑️ *4c [número]* ➔ Eliminar (ej: *4c 1*)\n🧹 *4d* ➔ Borrar todas las tareas\n\n_(Escribe *menu* para volver al menú principal)_`;

    res.json({
      success: true,
      phone,
      action: action || 'list',
      message: fullResponse,
      tasks: userTasks,
    });
  });

  return router;
}
