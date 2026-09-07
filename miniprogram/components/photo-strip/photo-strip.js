Component({
  properties: { photos: { type: Array, value: [] }, current: { type: Number, value: 0 } },
  methods: {
    select(e) { this.triggerEvent('select', { index: e.currentTarget.dataset.i }); },
    add() { this.triggerEvent('add'); },
  },
});
