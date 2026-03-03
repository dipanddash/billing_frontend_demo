import { Pencil, Trash2, BookOpen } from 'lucide-react'

interface Props {
  onEdit: () => void
  onDelete: () => void
  onRecipe: () => void
}

const ProductActions = ({ onEdit, onDelete, onRecipe }: Props) => {
  return (
    <div className="flex justify-end gap-3 mt-3 text-gray-500">
      <Pencil
        size={16}
        className="cursor-pointer hover:text-primary transition"
        onClick={onEdit}
      />
      <Trash2
        size={16}
        className="cursor-pointer hover:text-primary transition"
        onClick={onDelete}
      />
      <BookOpen
        size={16}
        className="cursor-pointer hover:text-primary transition"
        onClick={onRecipe}
      />
    </div>
  )
}

export default ProductActions