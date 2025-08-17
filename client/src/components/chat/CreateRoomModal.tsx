import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { ValidationUtils } from '@/utils/validation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateRoomFormData {
  name: string;
  description: string;
  isPrivate: boolean;
}

function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const { createRoom } = useChat();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<CreateRoomFormData>({
    defaultValues: {
      name: '',
      description: '',
      isPrivate: false,
    },
  });

  const onSubmit = async (data: CreateRoomFormData) => {
    // Validate form
    const validationErrors = ValidationUtils.validateRoomForm(data.name, data.description);
    
    if (ValidationUtils.hasErrors(validationErrors)) {
      Object.entries(validationErrors).forEach(([field, message]) => {
        if (message) {
          setError(field as keyof CreateRoomFormData, { message });
        }
      });
      return;
    }

    try {
      const room = await createRoom(data.name, data.description || undefined, data.isPrivate);
      
      if (room) {
        reset();
        onClose();
        toast.success(`Room "${room.name}" created successfully!`);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Room">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Room Name"
          placeholder="Enter room name"
          error={errors.name?.message}
          helperText="1-50 characters, letters, numbers, spaces, hyphens, underscores, and # allowed"
          {...register('name', { required: 'Room name is required' })}
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            rows={3}
            className="input-field resize-none"
            placeholder="Describe what this room is about..."
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">Maximum 200 characters</p>
        </div>

        <div className="flex items-center">
          <input
            id="isPrivate"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            {...register('isPrivate')}
          />
          <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-900">
            Make this room private
          </label>
        </div>
        <p className="text-xs text-gray-500 ml-6">
          Private rooms are only visible to invited members
        </p>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Room'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateRoomModal;