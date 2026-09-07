// mock 家庭与用户：本人=owner，毛小毛=member（规格书 4.4/4.5）
module.exports = {
  MOCK_SELF_OPENID: 'mock-self',
  MOCK_PARTNER_OPENID: 'mock-partner',
  users: [
    { _openid: 'mock-self', nickname: '本人', avatarUrl: '', role: 'owner', familyId: 'fam01' },
    { _openid: 'mock-partner', nickname: '毛小毛', avatarUrl: '', role: 'member', familyId: 'fam01' },
  ],
  family: { _id: 'fam01', inviteCode: 'K7F2QX', inviteEnabled: true },
};
