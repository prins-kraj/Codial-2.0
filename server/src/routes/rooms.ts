import { Router } from 'express';
import { RoomController } from '../controllers/roomController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All room routes require authentication
router.use(authenticateToken);

// Room management routes
router.get('/', RoomController.getRooms);
router.post('/', RoomController.createRoomValidation, RoomController.createRoom);
router.get('/:roomId', RoomController.getRoom);

// Room membership routes
router.post('/:roomId/join', RoomController.joinRoom);
router.post('/:roomId/leave', RoomController.leaveRoom);

// Room content routes
router.get('/:roomId/messages', RoomController.getRoomMessages);
router.get('/:roomId/members', RoomController.getRoomMembers);

export default router;