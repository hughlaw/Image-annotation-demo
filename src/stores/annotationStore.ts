export type AnnotationType = 'POLYGON' | 'DIRECTIONAL';

export interface Annotation {
  id: string;
  name: string;
  type: AnnotationType;
  points: number[];
  isClosed: boolean;
}

export type AnnotationAction =
  | { type: 'ADD_ANNOTATION'; payload: { name: string; annotationType: AnnotationType } }
  | { type: 'UPDATE_ANNOTATION_NAME'; payload: { id: string; name: string } }
  | { type: 'UPDATE_ANNOTATION_POINTS'; payload: { id: string; points: number[] } }
  | { type: 'REMOVE_ANNOTATION'; payload: { id: string } }
  | { type: 'SET_ACTIVE_ANNOTATION'; payload: { id: string } };

export function annotationReducer(state: Annotation[], action: AnnotationAction): Annotation[] {
  switch (action.type) {
    case 'ADD_ANNOTATION':
      return [
        ...state,
        {
          id: crypto.randomUUID(),
          name: action.payload.name,
          type: action.payload.annotationType,
          points: [],
          isClosed: false,
        },
      ];
    case 'UPDATE_ANNOTATION_NAME':
      return state.map((ann) => (ann.id === action.payload.id ? { ...ann, name: action.payload.name } : ann));
    case 'UPDATE_ANNOTATION_POINTS':
      return state.map((ann) => (ann.id === action.payload.id ? { ...ann, points: action.payload.points } : ann));
    case 'REMOVE_ANNOTATION':
      return state.filter((ann) => ann.id !== action.payload.id);
    case 'SET_ACTIVE_ANNOTATION':
      return state.map((ann) =>
        ann.id === action.payload.id ? { ...ann, isActive: true } : { ...ann, isActive: false }
      );
    default:
      return state;
  }
}

export function setActiveAnnotation(id: string) {
  return { type: 'SET_ACTIVE_ANNOTATION', payload: { id } };
}
