import { Method } from '../../interfaces';

interface Params {
  id: string;
}

const method: Method<Params> = {
  validation: (yup) => ({
    id: yup.string().required(),
  }),
  handler: async (params) => {
    return params.id;
  },
};

export default method;
