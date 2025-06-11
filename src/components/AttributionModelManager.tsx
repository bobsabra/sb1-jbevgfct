import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { AttributionModel, AttributionModelData, AttributionModelSettings } from '../types';

const modelSettingsSchema = z.object({
  lookback_window_days: z.number().min(1).max(90),
  decay_base: z.number().min(0.1).max(1).optional(),
  first_touch_weight: z.number().min(0).max(1).optional(),
  last_touch_weight: z.number().min(0).max(1).optional(),
  middle_touch_weight: z.number().min(0).max(1).optional(),
  min_touches_required: z.number().min(1).max(10).optional(),
  custom_weights: z.record(z.string(), z.number().min(0).max(1)).optional()
});

const attributionModelSchema = z.object({
  name: z.nativeEnum(AttributionModel),
  settings: modelSettingsSchema,
  is_active: z.boolean()
});

interface AttributionModelManagerProps {
  clientId: string;
  models: AttributionModelData[];
  onSave: (model: AttributionModelData) => void;
  onDelete: (modelId: string) => void;
}

const AttributionModelManager: React.FC<AttributionModelManagerProps> = ({
  clientId,
  models,
  onSave,
  onDelete
}) => {
  const [editingModel, setEditingModel] = useState<AttributionModelData | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    resolver: zodResolver(attributionModelSchema),
    defaultValues: {
      name: AttributionModel.LAST_TOUCH,
      settings: {
        lookback_window_days: 30,
        decay_base: 0.7,
        first_touch_weight: 0.4,
        last_touch_weight: 0.4,
        middle_touch_weight: 0.2,
        min_touches_required: 2
      },
      is_active: true
    }
  });

  const selectedModelType = watch('name');

  const handleCreateNew = () => {
    setEditingModel({
      id: '',
      name: AttributionModel.LAST_TOUCH,
      settings: {
        lookback_window_days: 30,
        decay_base: 0.7,
        first_touch_weight: 0.4,
        last_touch_weight: 0.4
      },
      is_active: true
    });
  };

  const onSubmit = async (data: any) => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const modelData: AttributionModelData = {
        ...editingModel!,
        ...data,
        settings: {
          ...data.settings,
          // Remove settings that don't apply to the selected model
          ...(data.name !== AttributionModel.TIME_DECAY && { decay_base: undefined }),
          ...(data.name !== AttributionModel.POSITION_BASED && {
            first_touch_weight: undefined,
            last_touch_weight: undefined,
            middle_touch_weight: undefined
          })
        }
      };
      
      await onSave(modelData);
      setEditingModel(null);
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (modelId: string) => {
    try {
      setDeleteError(null);
      await onDelete(modelId);
    } catch (error: any) {
      setDeleteError(error.message);
    }
  };

  const validateWeights = (data: any) => {
    if (data.name === AttributionModel.POSITION_BASED) {
      const { first_touch_weight, last_touch_weight, middle_touch_weight } = data.settings;
      const sum = (first_touch_weight || 0) + (last_touch_weight || 0) + (middle_touch_weight || 0);
      if (Math.abs(sum - 1) > 0.001) {
        return "Position-based weights must sum to 1";
      }
    }
    return null;
  };

  const renderSettingsFields = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Lookback Window (days)</label>
          <input
            type="number"
            {...register('settings.lookback_window_days')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.settings?.lookback_window_days && (
            <p className="mt-1 text-sm text-red-600">
              {errors.settings.lookback_window_days.message as string}
            </p>
          )}
        </div>

        {selectedModelType === AttributionModel.TIME_DECAY && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Decay Base</label>
            <input
              type="number"
              step="0.1"
              {...register('settings.decay_base')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.settings?.decay_base && (
              <p className="mt-1 text-sm text-red-600">
                {errors.settings.decay_base.message as string}
              </p>
            )}
          </div>
        )}

        {selectedModelType === AttributionModel.POSITION_BASED && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">First Touch Weight</label>
              <input
                type="number"
                step="0.1"
                {...register('settings.first_touch_weight')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.settings?.first_touch_weight && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.settings.first_touch_weight.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Touch Weight</label>
              <input
                type="number"
                step="0.1"
                {...register('settings.last_touch_weight')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.settings?.last_touch_weight && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.settings.last_touch_weight.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Middle Touch Weight</label>
              <input
                type="number"
                step="0.1"
                {...register('settings.middle_touch_weight')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.settings?.middle_touch_weight && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.settings.middle_touch_weight.message as string}
                </p>
              )}
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Minimum Touches Required</label>
          <input
            type="number"
            {...register('settings.min_touches_required')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.settings?.min_touches_required && (
            <p className="mt-1 text-sm text-red-600">
              {errors.settings.min_touches_required.message as string}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Attribution Models</h2>
          <p className="text-sm text-gray-500">Configure how conversions are attributed to marketing channels</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={16} className="mr-2" />
          New Model
        </button>
      </div>

      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{saveError}</p>
        </div>
      )}

      {deleteError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      <div className="space-y-4">
        {models.map((model) => (
          <div key={model.id} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-gray-900">{model.name}</h3>
                  {model.is_active && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  <p>Lookback: {model.settings.lookback_window_days} days</p>
                  {model.settings.decay_base && (
                    <p>Decay Base: {model.settings.decay_base}</p>
                  )}
                  {model.settings.first_touch_weight && (
                    <p>First Touch: {model.settings.first_touch_weight * 100}%</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingModel(model);
                    setSaveError(null);
                    setDeleteError(null);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(model.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingModel && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingModel.id ? 'Edit Model' : 'New Attribution Model'}
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Model Type</label>
                <select
                  {...register('name')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {Object.values(AttributionModel).map((model) => (
                    <option key={model} value={model}>
                      {model.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message as string}</p>
                )}
              </div>

              {renderSettingsFields()}

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('is_active')}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingModel(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  disabled={isSaving}
                >
                  <Save size={16} className="mr-2" />
                  {isSaving ? 'Saving...' : 'Save Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttributionModelManager;