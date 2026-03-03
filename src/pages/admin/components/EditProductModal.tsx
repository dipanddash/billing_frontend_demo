import { useState } from 'react'

interface Props {
  product: any
  categories: any[]
  onClose: () => void
  onSave: (formData: FormData) => void
}

const EditProductModal = ({
  product,
  categories,
  onClose,
  onSave
}: Props) => {
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(product.price)
  const [category, setCategory] = useState(product.category)
  const [isActive, setIsActive] = useState(product.is_active)
  const [image, setImage] = useState<File | null>(null)

  const handleSubmit = () => {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('price', price)
    formData.append('category', category)
    formData.append('is_active', String(isActive))

    if (image) {
      formData.append('image', image)
    }

    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-card w-[500px] rounded-lg p-[24px] space-y-[16px]">

        <h2 className="text-lg font-semibold">Edit Product</h2>

        {/* NAME */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-[12px] py-[10px] border rounded-md"
        />

        {/* CATEGORY */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-[12px] py-[10px] border rounded-md"
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* PRICE */}
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full px-[12px] py-[10px] border rounded-md"
        />

        {/* IMAGE */}
        <input
          type="file"
          onChange={(e) => {
            if (e.target.files) {
              setImage(e.target.files[0])
            }
          }}
          className="w-full"
        />

        {/* ACTIVE */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Is Active
        </label>

        {/* BUTTONS */}
        <div className="flex justify-end gap-[12px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[8px] border rounded-md text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-[16px] py-[8px] gradient-primary text-white rounded-md text-sm"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  )
}

export default EditProductModal