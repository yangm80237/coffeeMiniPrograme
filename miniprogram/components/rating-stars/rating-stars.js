Component({
  properties: { value: { type: Number, value: 0 }, readonly: { type: Boolean, value: false } },
  data: { stars: [1, 2, 3, 4, 5] },
  methods: {
    onTap(e) { if (!this.properties.readonly) this.triggerEvent('change', { value: e.currentTarget.dataset.v }); },
  },
});
